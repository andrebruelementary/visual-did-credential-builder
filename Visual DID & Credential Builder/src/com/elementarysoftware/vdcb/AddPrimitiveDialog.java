package com.elementarysoftware.vdcb;

import java.util.List;
import java.util.Vector;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Combo;
import org.eclipse.jface.viewers.ComboViewer;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.widgets.Text;

import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.DIDKeyInfo;
import com.elementarysoftware.prism.jobs.UpdateDIDJob;
import com.elementarysoftware.vdcb.tree.actions.JSONAction;

import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismKeyInformation;
import io.iohk.atala.prism.identity.PrismKeyType;

public class AddPrimitiveDialog extends Dialog {
	private Text textPrimitiveValue;
	private Combo comboPrimitiveType;
	
	private String selectedType;
	private String primitiveValue;
	
	//private Class primitiveType = Object.class;
	//private int keyIndex = -1;
	//private DID did;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public AddPrimitiveDialog(Shell parentShell) {
		super(parentShell);
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
		gridLayout.numColumns = 3;
		new Label(container, SWT.NONE);

		Label lblType = new Label(container, SWT.NONE);
		lblType.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblType.setText("Type");

		ComboViewer comboKeyTypeViewer = new ComboViewer(container, SWT.NONE);
		comboPrimitiveType = comboKeyTypeViewer.getCombo();
		comboPrimitiveType.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
		comboPrimitiveType.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				setDefaultValue();
			}
		});

		List<String> primitiveTypes = new Vector<String>();
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_STRING);
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_INTEGER);
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_DOUBLE);

		comboPrimitiveType.setItems(primitiveTypes.toArray(String[]::new));

		new Label(container, SWT.NONE);

		Label lblValue = new Label(container, SWT.NONE);
		lblValue.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblValue.setText("Value");

		textPrimitiveValue = new Text(container, SWT.BORDER);
		textPrimitiveValue.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
		
		comboPrimitiveType.select(0);
		setDefaultValue();

		return container;
	}

	/**
	 * Create contents of the button bar.
	 * 
	 * @param parent
	 */
	@Override
	protected void createButtonsForButtonBar(Composite parent) {
		createButton(parent, IDialogConstants.OK_ID, IDialogConstants.OK_LABEL, true);
		createButton(parent, IDialogConstants.CANCEL_ID, IDialogConstants.CANCEL_LABEL, false);
	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 300);
	}

	
	private void setDefaultValue() {

		System.out.println("0");
		String defaultValue = "";
		
		if (comboPrimitiveType.getSelectionIndex() == -1)
			return;

		String selectedPrimitiveType = comboPrimitiveType.getItem(comboPrimitiveType.getSelectionIndex());
		if (selectedPrimitiveType.equals(JSONAction.PRIMITIVE_TYPE_STRING)) {
			defaultValue = "new text value";
		} else if (selectedPrimitiveType.equals(JSONAction.PRIMITIVE_TYPE_INTEGER)) {
			defaultValue = String.valueOf(0).toString();
		} else if (selectedPrimitiveType.equals(JSONAction.PRIMITIVE_TYPE_DOUBLE)) {
			defaultValue = String.valueOf(0.0).toString();
		}
		else {
			System.err.println("What?");
			return;
		}

		textPrimitiveValue.setText(defaultValue);
		
	}

	@Override
	protected void okPressed() {

		// check value has been provided
		if (textPrimitiveValue.getText().trim().equals("")) {
			MessageDialog.openWarning(getParentShell(), "No value provided", "Please provide value to continue");
			return;
		}
		
		selectedType = comboPrimitiveType.getItem(comboPrimitiveType.getSelectionIndex());
		primitiveValue = textPrimitiveValue.getText().trim();

		super.okPressed();
	}

	public String getSelectedType() {
		return selectedType;
	}

	public String getPrimitiveValue() {
		return primitiveValue;
	}

}
