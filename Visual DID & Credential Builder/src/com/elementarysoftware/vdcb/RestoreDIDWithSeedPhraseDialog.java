package com.elementarysoftware.vdcb;

import java.io.FileNotFoundException;
import java.util.List;
import java.util.Vector;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.fieldassist.AutoCompleteField;
import org.eclipse.jface.fieldassist.ComboContentAdapter;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Button;

import org.eclipse.swt.widgets.Combo;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Text;

import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.DIDVault;

import io.iohk.atala.prism.crypto.derivation.KeyDerivation;

public class RestoreDIDWithSeedPhraseDialog extends Dialog {

	final int PHRASES_IN_SEED = 12;
	protected Combo[] seedPhraseFields = new Combo[PHRASES_IN_SEED];
	protected List<String> seedPhrases = new Vector<String>(PHRASES_IN_SEED);
	private Text tfDIDName;
	private Text tfDIDPassphrase;
	private DID restoredDID;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public RestoreDIDWithSeedPhraseDialog(Shell parentShell) {
		super(parentShell);
	}

	public DID getRestoredDID() {
		return restoredDID;
	}

	protected void loadPhrasesFromUI() {
		for (int i = 0; i < PHRASES_IN_SEED; i++) {
			seedPhrases.add((seedPhraseFields[i]).getText());
		}

		// for(int i = 0; i < PHRASES_IN_SEED; i++) {
		// System.out.println(seedPhrases.get(i));
		// }
	}

	@Override
	protected void configureShell(Shell newShell) {
		// TODO Auto-generated method stub
		super.configureShell(newShell);
		newShell.setText("Import DID - Seed phrase dialog");
	}

	/**
	 * Create contents of the dialog.
	 * 
	 * @param parent
	 */
	@Override
	protected Control createDialogArea(Composite parent) {
		Composite container = (Composite) super.createDialogArea(parent);
		GridLayout gridLayout = (GridLayout) container.getLayout();
		gridLayout.numColumns = 4;

		Label lblName = new Label(container, SWT.NONE);
		lblName.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblName.setText("Name:");

		tfDIDName = new Text(container, SWT.BORDER);
		tfDIDName.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));

		Label lblPassphrase = new Label(container, SWT.NONE);
		lblPassphrase.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblPassphrase.setText("Passphrase:");

		tfDIDPassphrase = new Text(container, SWT.BORDER | SWT.PASSWORD);
		tfDIDPassphrase.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));

		KeyDerivation keyder = KeyDerivation.INSTANCE;
		List<String> validWords = keyder.getValidMnemonicWords();
		String[] seedPhrases = validWords.toArray(String[]::new);

		for (int i = 1; i <= PHRASES_IN_SEED; i++) {

			Label label = new Label(container, SWT.NONE);
			label.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
			label.setText("" + i);

			Combo combo = new Combo(container, SWT.NONE);
			combo.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
			combo.setItems(seedPhrases);
			new AutoCompleteField(combo, new ComboContentAdapter(), seedPhrases);

			seedPhraseFields[i - 1] = combo;

			/*
			 * Label lblNewLabel = new Label(container, SWT.NONE);
			 * lblNewLabel.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false,
			 * 1, 1)); lblNewLabel.setText("2");
			 * 
			 * Combo combo_2 = new Combo(container, SWT.NONE); combo_2.setLayoutData(new
			 * GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
			 * combo_2.setItems(seedPhrases); new AutoCompleteField(combo_2, new
			 * ComboContentAdapter(), seedPhrases);
			 */
		}

		return container;
	}

	/**
	 * Create contents of the button bar.
	 * 
	 * @param parent
	 */
	@Override
	protected void createButtonsForButtonBar(Composite parent) {
		Button button = createButton(parent, IDialogConstants.OK_ID, IDialogConstants.OK_LABEL, true);
		button.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
			}
		});
		createButton(parent, IDialogConstants.CANCEL_ID, IDialogConstants.CANCEL_LABEL, false);
	}

	@Override
	protected void okPressed() {

		loadPhrasesFromUI();

		try {
			DIDVault didVault = new DIDVault();
			restoredDID = didVault.restoreFromSeedPhrases(tfDIDName.getText(), seedPhrases, tfDIDPassphrase.getText());
			super.okPressed();
		} catch (FileNotFoundException fnfe) {
			MessageDialog.openError(getShell(), "Error occurred", fnfe.getMessage());
		} catch (Exception cse) {

			if (cse.getClass().equals(io.iohk.atala.prism.crypto.derivation.MnemonicChecksumException.class)) {
				MessageDialog.openError(getShell(), "Error occurred",
						"The provided seed phrase words has invalid checksum. Please verify you supplied the correct words");
			}

			System.err.println(cse.getClass().toString() + " " + cse.getMessage());

		}

	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 500);
	}

}
